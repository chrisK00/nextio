using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Services;

public sealed record ServerLogEntry(DateTime Timestamp, LogLevel Level, string Category, string Message, string? Exception);

public sealed class InMemoryLogProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<ServerLogEntry> _entries = new();
    private const int MaximumEntries = 200;
    private const int MaximumMessageCharacters = 2048;
    private const int MaximumExceptionCharacters = 8192;
    public ILogger CreateLogger(string categoryName) => new BufferedLogger(categoryName, _entries);
    public IReadOnlyList<ServerLogEntry> GetRecent(int count = 250) => _entries.Reverse().Take(Math.Clamp(count, 1, MaximumEntries)).ToList();
    public void Dispose() { }

    private sealed class BufferedLogger(string categoryName, ConcurrentQueue<ServerLogEntry> entries) : ILogger
    {
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;
            entries.Enqueue(new ServerLogEntry(
                DateTime.UtcNow,
                logLevel,
                categoryName,
                Truncate(formatter(state, exception), MaximumMessageCharacters),
                exception is null ? null : Truncate(exception.ToString(), MaximumExceptionCharacters)));
            while (entries.Count > MaximumEntries && entries.TryDequeue(out _)) { }
        }

        private static string Truncate(string value, int maximumCharacters) =>
            value.Length <= maximumCharacters ? value : value[..maximumCharacters] + "… [truncated]";
        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}
