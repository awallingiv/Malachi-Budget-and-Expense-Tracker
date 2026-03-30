using System.Net;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace ReactBudget.Api.Middleware;

public class GlobalExceptionHandler
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionHandler(RequestDelegate next, ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            SqlException sqlEx when sqlEx.Number == -2 => (HttpStatusCode.GatewayTimeout, "Database timeout"),
            SqlException sqlEx when sqlEx.Class >= 20 => (HttpStatusCode.InternalServerError, "Database login failed"),
            SqlException => (HttpStatusCode.BadRequest, "Database request error"),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Not authorized"),
            Microsoft.IdentityModel.Tokens.SecurityTokenExpiredException => (HttpStatusCode.Unauthorized, "Token expired"),
            Microsoft.IdentityModel.Tokens.SecurityTokenException => (HttpStatusCode.Unauthorized, "Invalid token"),
            _ => (HttpStatusCode.InternalServerError, "Server Error")
        };

        context.Response.StatusCode = (int)statusCode;

        var response = new Dictionary<string, object?>
        {
            ["success"] = false,
            ["error"] = message
        };

        if (_env.IsDevelopment())
        {
            response["stack"] = exception.StackTrace;
        }

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}
