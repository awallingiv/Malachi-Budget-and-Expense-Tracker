using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Responses;

public class ApiResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class ApiResponse<T> : ApiResponse
{
    [JsonPropertyName("data")]
    public T? Data { get; set; }
}
