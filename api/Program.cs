using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Features.Search.Services;
using Features.Library.Services;
using Microsoft.AspNetCore.HttpOverrides;
using nextio.Api.Features.Library.Services;

var builder = WebApplication.CreateBuilder(args);

// JWT configuration (reads from appsettings.json)
var jwtKey = builder.Configuration["Jwt:Key"] ?? "change_this_development_key_to_a_long_random_value";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "nextio";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "nextio_clients";
var dbPath = Path.Combine(builder.Environment.ContentRootPath, "nextio.db");

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache(opt =>
{
    opt.SizeLimit = 20000;
});

// CORS for local development (vite dev server)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000").AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

builder.Services.AddSingleton<Services.JwtService>();
builder.Services.AddDbContext<Data.ApplicationDbContext>(options =>
{
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? $"Data Source={dbPath}");
});

builder.Services.AddProblemDetails();
builder.Services.AddScoped<IPasswordHasher<Models.User>, PasswordHasher<Models.User>>();
builder.Services.AddScoped<Services.IUserService, Services.UserService>();
builder.Services.AddScoped<ILibraryService, LibraryService>();
builder.Services.AddSingleton<ILibrarySyncStatusStore, LibrarySyncStatusStore>();
builder.Services.AddScoped<ILibrarySyncService, LibrarySyncService>();
builder.Services.AddHostedService<LibrarySyncWorker>();
builder.Services.AddSingleton<IBackupService, BackupService>();
builder.Services.AddHostedService<BackupWorker>();
builder.Services.AddHttpClient<TmdbApi>(client =>
{
    client.BaseAddress = new Uri("https://api.themoviedb.org/3/");
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    app.Logger.LogError(exception, "Unhandled exception: {Message}", exception?.Message);

    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new
    {
        Status = 500,
        Title = "An error occurred",
        Detail = app.Environment.IsDevelopment() ? exception?.ToString() : "An unexpected error occurred."
    });
}));

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "v1");
    });
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseCors();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<Data.ApplicationDbContext>();
    db.Database.GetPendingMigrations();
    if (db.Database.CanConnect() || db.Database.GetPendingMigrations().Any())
    {
        logger.LogWarning("Applied Migrations: {AppliedMigrationsCount}, Pending Migrations: {PendingMigrationsCount}", db.Database.GetAppliedMigrations().Count(), db.Database.GetPendingMigrations().Count());
        db.Database.Migrate();
    }
}

app.Run();
