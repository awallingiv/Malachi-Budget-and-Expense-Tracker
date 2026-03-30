using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Responses;

public class PaginatedResponse<T>
{
    [JsonPropertyName("data")]
    public List<T> Data { get; set; } = [];

    [JsonPropertyName("pagination")]
    public PaginationMeta Pagination { get; set; } = new();
}

public class PaginationMeta
{
    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("limit")]
    public int Limit { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }

    [JsonPropertyName("hasMore")]
    public bool HasMore { get; set; }
}
