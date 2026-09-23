//AWS SDK
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});
const TABLE = "user";

export const handler = async (event) => {

  let rawBody = event.body || "";
  const body = rawBody ? JSON.parse(rawBody) : {};

  try {

    switch (event.routeKey) {
      case "GET /items":
        return await listItems();

      case "POST /item-create":
        return await createItem(body);

      case "DELETE /item/{id}":
        return await deleteItem(event);

      case "PUT /item-update/{id}":
        return await updateItem(event, body);

      case "POST /generate-presigned-url":
        return await generatePresignedURL(body);

      default:
        return { statusCode: 404, body: JSON.stringify({ message: "Not found!" }) };
    }
  } catch (error) {
    console.log(error);
    return { statusCode: 500, body: JSON.stringify({ message: error }) };
  }
};

//This is items list event
async function listItems() {
  const S3_BASE = `https://${process.env.BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  const { Items } = await client.send(new ScanCommand({ TableName: TABLE }));
  const res = Items.map(item => ({ ...item, image: `${S3_BASE}/${item.image}` }));
  return { statusCode: 200, body: JSON.stringify(res) };
}

//This is item create event
async function createItem(body) {

  //DynomoDB call
  const item = { userId: randomUUID(), name: body.name, active: body.active, image: body.image }; // generate new id
  const response = await client.send(new PutCommand({ TableName: TABLE, Item: item }));

  const res = {
    statusCode: 201,
    message: "Item created"
  }

  return { statusCode: 201, body: JSON.stringify(res) };
}

//This is item delete event
async function deleteItem(event) {
  if (!event.pathParameters.id) {
    return { statusCode: 400, body: JSON.stringify({ message: "missing id" }) };
  }
  await client.send(new DeleteCommand({
    TableName: TABLE,
    Key: { userId: event.pathParameters.id }
  }));

  return { statusCode: 200, body: JSON.stringify({ message: "Item is sucessfully deleted" }) };
}

//This is item update event
async function updateItem(event, body) {
  if (!event.pathParameters.id) return { statusCode: 400, body: JSON.stringify({ message: "missing id" }) };
  await client.send(new PutCommand({
    TableName: TABLE,
    Item: { userId: event.pathParameters.id, name: body.name, active: body.active }
  }));
  return { statusCode: 201, body: JSON.stringify({ message: "Item is sucessfully updated" }) };
}

//Pre-signed URLs generate event
async function generatePresignedURL(body) {
  console.log('content-type :>> ', body.type);
 
  const bucketName = "rushdy-s3-bucket";
  const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = ALLOWED[body.type];
  
  if (!ext) {
    return { statusCode: 400, body: JSON.stringify({ message: "Unsupported content type" }) };
  }
  const keyName = `profiles/${randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: keyName
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { url , keyName };
}