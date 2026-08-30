using nextio.Api.Features.Search.Services;
using Xunit;

namespace nextio.Api.Tests;

public class TmdbShowIdExtractorTests
{
    [Theory]
    [InlineData("12345", 12345)]
    [InlineData("tv:12345", 12345)]
    [InlineData("movie:67890", 67890)]
    [InlineData("show:999", 999)]
    public void Extract_ValidIds_ShouldReturnInteger(string input, int expected)
    {
        var result = TmdbShowIdExtractor.Extract(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("tv:abc")]
    [InlineData("movie:")]
    public void Extract_InvalidIds_ShouldThrowInvalidOperationException(string input)
    {
        Assert.Throws<InvalidOperationException>(() => TmdbShowIdExtractor.Extract(input));
    }
}
