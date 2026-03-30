using System.Data;
using Microsoft.Data.SqlClient;
using ReactBudget.Api.Configuration;
using Microsoft.Extensions.Options;

namespace ReactBudget.Api.Services;

public interface IDatabaseService
{
    Task<List<Dictionary<string, object?>>> ExecuteStoredProcedureAsync(string procedureName, params SqlParameter[] parameters);
    Task<List<List<Dictionary<string, object?>>>> ExecuteStoredProcedureMultiSetAsync(string procedureName, params SqlParameter[] parameters);
    Task<int> ExecuteStoredProcedureNonQueryAsync(string procedureName, params SqlParameter[] parameters);
    Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string query, params SqlParameter[] parameters);
    Task<List<List<Dictionary<string, object?>>>> ExecuteQueryMultiSetAsync(string query, params SqlParameter[] parameters);
    Task<bool> TestConnectionAsync();
}

public class DatabaseService : IDatabaseService
{
    private readonly string _connectionString;
    private readonly ILogger<DatabaseService> _logger;

    public DatabaseService(IOptions<DatabaseSettings> settings, ILogger<DatabaseService> logger)
    {
        _connectionString = settings.Value.ConnectionString;
        _logger = logger;
    }

    public async Task<List<Dictionary<string, object?>>> ExecuteStoredProcedureAsync(string procedureName, params SqlParameter[] parameters)
    {
        var resultSets = await ExecuteStoredProcedureMultiSetAsync(procedureName, parameters);
        return resultSets.Count > 0 ? resultSets[0] : [];
    }

    public async Task<List<List<Dictionary<string, object?>>>> ExecuteStoredProcedureMultiSetAsync(string procedureName, params SqlParameter[] parameters)
    {
        _logger.LogDebug("Executing stored procedure: {ProcedureName}", procedureName);

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(procedureName, connection)
        {
            CommandType = CommandType.StoredProcedure,
            CommandTimeout = 30
        };

        foreach (var param in parameters)
            command.Parameters.Add(param);

        await using var reader = await command.ExecuteReaderAsync();
        return await ReadAllResultSetsAsync(reader);
    }

    public async Task<int> ExecuteStoredProcedureNonQueryAsync(string procedureName, params SqlParameter[] parameters)
    {
        _logger.LogDebug("Executing stored procedure (non-query): {ProcedureName}", procedureName);

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(procedureName, connection)
        {
            CommandType = CommandType.StoredProcedure,
            CommandTimeout = 30
        };

        foreach (var param in parameters)
            command.Parameters.Add(param);

        return await command.ExecuteNonQueryAsync();
    }

    public async Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string query, params SqlParameter[] parameters)
    {
        var resultSets = await ExecuteQueryMultiSetAsync(query, parameters);
        return resultSets.Count > 0 ? resultSets[0] : [];
    }

    public async Task<List<List<Dictionary<string, object?>>>> ExecuteQueryMultiSetAsync(string query, params SqlParameter[] parameters)
    {
        _logger.LogDebug("Executing query");

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(query, connection)
        {
            CommandType = CommandType.Text,
            CommandTimeout = 30
        };

        foreach (var param in parameters)
            command.Parameters.Add(param);

        await using var reader = await command.ExecuteReaderAsync();
        return await ReadAllResultSetsAsync(reader);
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            await using var command = new SqlCommand("SELECT 1", connection);
            var result = await command.ExecuteScalarAsync();
            return result is int i && i == 1;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database connection test failed");
            return false;
        }
    }

    private static async Task<List<List<Dictionary<string, object?>>>> ReadAllResultSetsAsync(SqlDataReader reader)
    {
        var allSets = new List<List<Dictionary<string, object?>>>();

        do
        {
            var rows = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var value = reader.GetValue(i);
                    row[reader.GetName(i)] = value == DBNull.Value ? null : value;
                }
                rows.Add(row);
            }
            allSets.Add(rows);
        } while (await reader.NextResultAsync());

        return allSets;
    }
}

// Extension for SqlParameter creation helpers
public static class SqlParamHelper
{
    public static SqlParameter UniqueId(string name, Guid? value) =>
        new(name, SqlDbType.UniqueIdentifier) { Value = value.HasValue ? value.Value : DBNull.Value };

    public static SqlParameter VarChar(string name, string? value, int size = 50) =>
        new(name, SqlDbType.VarChar, size) { Value = (object?)value ?? DBNull.Value };

    public static SqlParameter NVarChar(string name, string? value, int size = 50) =>
        new(name, SqlDbType.NVarChar, size) { Value = (object?)value ?? DBNull.Value };

    public static SqlParameter NVarCharMax(string name, string? value) =>
        new(name, SqlDbType.NVarChar, -1) { Value = (object?)value ?? DBNull.Value };

    public static SqlParameter Int(string name, int? value) =>
        new(name, SqlDbType.Int) { Value = value.HasValue ? value.Value : DBNull.Value };

    public static SqlParameter Float(string name, double? value) =>
        new(name, SqlDbType.Float) { Value = value.HasValue ? value.Value : DBNull.Value };

    public static SqlParameter Bit(string name, bool? value) =>
        new(name, SqlDbType.Bit) { Value = value.HasValue ? value.Value : DBNull.Value };

    public static SqlParameter DateTime(string name, DateTime? value) =>
        new(name, SqlDbType.DateTime) { Value = value.HasValue ? value.Value : DBNull.Value };

    public static SqlParameter Date(string name, DateTime? value) =>
        new(name, SqlDbType.Date) { Value = value.HasValue ? value.Value : DBNull.Value };

    public static SqlParameter TinyInt(string name, byte? value) =>
        new(name, SqlDbType.TinyInt) { Value = value.HasValue ? value.Value : DBNull.Value };
}
