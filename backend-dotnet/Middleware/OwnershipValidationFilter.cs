using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ReactBudget.Api.Middleware;

/// <summary>
/// Action filter that validates the authenticated user owns the resource being accessed.
/// Compares userId from route/body against the JWT claim.
/// </summary>
public class OwnershipValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var userIdClaim = context.HttpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            context.Result = new UnauthorizedObjectResult(new { success = false, error = "Not authorized" });
            return;
        }

        // Check route parameter
        string? requestedUserId = null;

        if (context.RouteData.Values.TryGetValue("userId", out var routeUserId))
        {
            requestedUserId = routeUserId?.ToString();
        }

        // Check action arguments for userId/UserID in body
        if (requestedUserId == null)
        {
            foreach (var arg in context.ActionArguments.Values)
            {
                if (arg == null) continue;

                var type = arg.GetType();
                var prop = type.GetProperty("UserId") ?? type.GetProperty("UserID") ?? type.GetProperty("userId");
                if (prop != null)
                {
                    var val = prop.GetValue(arg);
                    if (val != null)
                    {
                        requestedUserId = val.ToString();
                        break;
                    }
                }
            }
        }

        if (requestedUserId != null &&
            !string.Equals(requestedUserId, userIdClaim, StringComparison.OrdinalIgnoreCase))
        {
            context.Result = new ObjectResult(new { success = false, error = "Not authorized to access this resource" })
            {
                StatusCode = 403
            };
            return;
        }

        await next();
    }
}
