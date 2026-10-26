import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { authenticatedUserId, response } from "./shared/http.mjs";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DATA_TABLE;
const recordKey = "PLANNER_DATA_V1";

export async function handler(event) {
  try {
    const userId = authenticatedUserId(event);
    if (!tableName) throw new Error("DATA_TABLE is not configured.");

    const result = await db.send(new GetCommand({
      TableName: tableName,
      Key: { userId, recordKey },
      ConsistentRead: true,
    }));

    return response(200, {
      data: result.Item?.data ?? null,
      version: result.Item?.version ?? 0,
      updatedAt: result.Item?.updatedAt ?? null,
    });
  } catch (error) {
    const status = error.statusCode ?? 500;
    if (status >= 500) console.error("Unable to load planner data", { name: error.name });
    return response(status, { error: status >= 500 ? "Unable to load your data right now." : error.message });
  }
}
