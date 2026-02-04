/**
 * Lambda function for findCustomerByPhone query
 * Handles phone normalization and DynamoDB lookup
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Normalize phone: E.164-like format without spaces
 * trim whitespace, remove spaces and hyphens, keep + prefix if present
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  return phone.trim().replace(/[\s-]/g, '');
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Extract phone from AppSync event
    const phone = event.arguments?.phone || event.phone;
    
    if (!phone) {
      return {
        error: {
          message: 'phone is required',
          errorType: 'ValidationError',
        },
      };
    }

    // Normalize phone number
    const phoneNorm = normalizePhone(phone);
    
    if (!phoneNorm || phoneNorm.length === 0) {
      return {
        error: {
          message: 'phone cannot be empty after normalization',
          errorType: 'ValidationError',
        },
      };
    }

    // Step 1: Get phone lookup to retrieve customerId
    const lookupKey = {
      PK: `CUSTOMER_PHONE#${phoneNorm}`,
      SK: 'LOOKUP',
    };

    const lookupResult = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: lookupKey,
      })
    );

    if (!lookupResult.Item || !lookupResult.Item.customerId) {
      // Phone not found
      return null;
    }

    const customerId = lookupResult.Item.customerId;

    // Step 2: Get customer profile
    const customerKey = {
      PK: `CUSTOMER#${customerId}`,
      SK: 'PROFILE',
    };

    const customerResult = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: customerKey,
      })
    );

    if (!customerResult.Item) {
      // Customer profile not found
      return null;
    }

    // Return Customer fields (exclude internal keys)
    return {
      customerId: customerResult.Item.customerId,
      fullName: customerResult.Item.fullName,
      email: customerResult.Item.email || null,
      phone: customerResult.Item.phone || null,
      updatedAt: customerResult.Item.updatedAt,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      error: {
        message: error.message || 'Internal server error',
        errorType: 'InternalError',
      },
    };
  }
};

