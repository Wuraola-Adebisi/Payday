import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authenticatedUserId, parseJsonBody, response } from "./shared/http.mjs";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DATA_TABLE;
const recordKey = "PLANNER_DATA_V1";

function isPlannerData(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.plan &&
    typeof value.plan === "object" &&
    Array.isArray(value.transactions) &&
    Array.isArray(value.bills) &&
    Array.isArray(value.goals)
  );
}

export async function handler(event) {
  try {
    const userId = authenticatedUserId(event);
    if (!tableName) throw new Error("DATA_TABLE is not configured.");

    const body = parseJsonBody(event);
    if (!isPlannerData(body.data)) {
      return response(400, {
        error: "Expected data with plan, transactions, bills and goals.",
      });
    }

    const updatedAt = new Date().toISOString();
    const result = await db.send(new UpdateCommand({
      TableName: tableName,
      Key: { userId, recordKey },
      UpdateExpression: "SET #data = :data, updatedAt = :updatedAt ADD #version :increment",
      ExpressionAttributeNames: {
        "#data": "data",
        "#version": "version",
      },
      ExpressionAttributeValues: {
        ":data": body.data,
        ":updatedAt": updatedAt,
        ":increment": 1,
      },
      ReturnValues: "ALL_NEW",
    }));

    return response(200, {
      data: result.Attributes.data,
      version: result.Attributes.version,
      updatedAt: result.Attributes.updatedAt,
    });
  } catch (error) {
    const status = error.statusCode ?? 500;
    if (status >= 500) console.error("Unable to save planner data", { name: error.name });
    return response(status, { error: status >= 500 ? "Unable to save your data right now." : error.message });
  }
}
