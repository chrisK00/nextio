using Microsoft.EntityFrameworkCore;
using Models;

namespace Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<UserTvShow> UserTvShows { get; set; } = null!;
        public DbSet<UserMovie> UserMovies { get; set; } = null!;
        public DbSet<UserTvShowEpisode> UserTvShowEpisodes { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
            modelBuilder.Entity<RefreshToken>().HasIndex(r => r.Token).IsUnique();
            modelBuilder.Entity<UserTvShow>().HasIndex(x => new { x.UserId, x.ShowId }).IsUnique();
            modelBuilder.Entity<UserMovie>().HasIndex(x => new { x.UserId, x.MovieId }).IsUnique();
            modelBuilder.Entity<UserTvShowEpisode>().HasIndex(x => new { x.UserTvShowId, x.Season, x.Episode }).IsUnique();
            modelBuilder.Entity<UserTvShow>()
                .HasMany(x => x.Episodes)
                .WithOne()
                .HasForeignKey(x => x.UserTvShowId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserTvShow>()
            .OwnsOne(x => x.NextEpisodeToAir);

            modelBuilder.Entity<UserTvShow>()
                .OwnsMany(x => x.SeasonsMetadata, builder =>
                {
                    // Tells EF Core to use the parent's ID + SeasonNumber as the primary key
                    builder.WithOwner().HasForeignKey("UserTvShowId");
                    builder.HasKey("UserTvShowId", nameof(ShowSeasonMetadata.SeasonNumber));
                });
        }
    }
}
