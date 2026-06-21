namespace nextio.Api.Features.Search.Services
{
    public class TmdbShowIdExtractor
    {
        public static int Extract(string id)
        {
            var rawId = id.Contains(':') ? id.Split(':', 2)[1] : id;
            if (!int.TryParse(rawId, out var showId))
                throw new InvalidOperationException($"Invalid TMDb show id: {id}");

            return showId;
        }
    }
}