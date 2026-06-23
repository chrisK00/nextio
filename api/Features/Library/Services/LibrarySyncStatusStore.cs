namespace nextio.Api.Features.Library.Services;

public interface ILibrarySyncStatusStore
{
    void MarkSuccess(DateTime at, string message);
    void MarkFailure(DateTime at, string message);
    (DateTime? LastSyncAt, bool? LastSyncSucceeded, string? LastSyncMessage) Snapshot();
}

public sealed class LibrarySyncStatusStore : ILibrarySyncStatusStore
{
    private readonly Lock _gate = new();
    private DateTime? _lastSyncAt;
    private bool? _lastSyncSucceeded;
    private string? _lastSyncMessage;

    public void MarkSuccess(DateTime at, string message)
    {
        lock (_gate)
        {
            _lastSyncAt = at;
            _lastSyncSucceeded = true;
            _lastSyncMessage = message;
        }
    }

    public void MarkFailure(DateTime at, string message)
    {
        lock (_gate)
        {
            _lastSyncAt = at;
            _lastSyncSucceeded = false;
            _lastSyncMessage = message;
        }
    }

    public (DateTime? LastSyncAt, bool? LastSyncSucceeded, string? LastSyncMessage) Snapshot()
    {
        lock (_gate)
        {
            return (_lastSyncAt, _lastSyncSucceeded, _lastSyncMessage);
        }
    }
}
