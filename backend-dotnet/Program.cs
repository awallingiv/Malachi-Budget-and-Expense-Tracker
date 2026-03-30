using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using ReactBudget.Api.Configuration;
using ReactBudget.Api.Middleware;
using ReactBudget.Api.Services;
using Serilog;

// ── Bootstrap Serilog ──
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ──
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console());

    // ── Bind configuration sections ──
    builder.Services.Configure<DatabaseSettings>(builder.Configuration.GetSection("DatabaseSettings"));
    builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
    builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
    builder.Services.Configure<CorsSettings>(builder.Configuration.GetSection("CorsSettings"));
    builder.Services.Configure<RateLimitSettings>(builder.Configuration.GetSection("RateLimitSettings"));

    // ── Application services ──
    builder.Services.AddSingleton<IDatabaseService, DatabaseService>();
    builder.Services.AddSingleton<ITokenService, TokenService>();
    builder.Services.AddSingleton<IEmailService, EmailService>();

    // ── JWT authentication ──
    var jwtSecret = builder.Configuration["JwtSettings:Secret"]
        ?? throw new InvalidOperationException("JwtSettings:Secret is not configured");

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

    // ── CORS ──
    var corsOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() ?? [];

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    // ── Rate limiting ──
    var rateLimitEnabled = builder.Configuration.GetValue<bool>("RateLimitSettings:Enabled");
    if (rateLimitEnabled)
    {
        var windowMs = builder.Configuration.GetValue<int>("RateLimitSettings:WindowMs");
        var maxRequests = builder.Configuration.GetValue<int>("RateLimitSettings:MaxRequests");

        builder.Services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = maxRequests,
                        Window = TimeSpan.FromMilliseconds(windowMs)
                    }));
            options.RejectionStatusCode = 429;
        });
    }

    // ── Response compression ──
    builder.Services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
        options.Providers.Add<GzipCompressionProvider>();
    });

    // ── Controllers + JSON ──
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            // Preserve C# property names as-is (no camelCase transform)
            // to match the Node.js backend's response format
            options.JsonSerializerOptions.PropertyNamingPolicy = null;
            options.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    // ── Swagger ──
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
        {
            Title = "ReactBudget API",
            Version = "v1"
        });
        options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Description = "Enter your JWT token"
        });
        options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            {
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    var app = builder.Build();

    // ── Middleware pipeline (order matters) ──
    app.UseMiddleware<GlobalExceptionHandler>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseResponseCompression();
    app.UseCors();

    if (rateLimitEnabled)
    {
        app.UseRateLimiter();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    // ── Health check endpoint ──
    app.MapGet("/api/health", async (IDatabaseService db) =>
    {
        var dbOk = await db.TestConnectionAsync();
        return Results.Ok(new
        {
            status = "ok",
            timestamp = DateTime.UtcNow,
            database = dbOk ? "connected" : "disconnected",
            version = "1.0.0-dotnet"
        });
    });

    Log.Information("ReactBudget .NET API starting on port 5001");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
