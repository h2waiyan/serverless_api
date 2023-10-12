const AWS = require("aws-sdk");
AWS.config.update({ region: "ap-northeast-1" });
const dyanmodb = new AWS.dyanmoDB.DocumentClient();
const dyanmodbtable = "dyanamoone";
const healthpath = "/health";
const productPath = "/product";
const prductsPath = "/products";

exports.handler = async function (event) {
  console.log("Request Event: ", event);
  let response;

  switch (true) {
    case event.httpMethod === "GET" && event.path === healthpath:
      response = buildResponse(200);
      break;

    case event.httpMethod === "GET" && event.path === prductsPath:
      response = await getProducts();
      break;

    case event.httpMethod === "GET" && event.path === productPath:
      response = await getProdcut(event.queryStringParameters.productid);
      break;

    case event.httpMethod === "POST" && event.path === productPath:
      response = await saveProduct(JSON.parse(event.body));
      break;

    case event.httpMethod === "PATCH" && event.path === productPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyProduct(
        requestBody.productid,
        requestBody.updateKey,
        requestBody.updateValue
      );
      break;

    case event.httpMethod === "DELETE" && event.path === productPath:
      response = await deleteProduct(JSON.parse(event.body).productid);
      break;
  }
};

async function getProdcut(productid) {
  const params = {
    TableName: dyanmodbtable,
    Key: {
      productid: productid,
    },
  };

  return await dyanmodb
    .get(params)
    .promise()
    .then((response) => {
      buildResponse(200, response.Item);
    })
    .catch((err) => {
      console.log("Error", err);
    });
}

async function getProducts() {
  const params = {
    TableName: dyanmodbtable,
  };

  const allProducts = await scanDaynamoRecords(params, []);
  const body = {
    product: allProducts,
  };
}

async function scanDaynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dyanmodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartKey = dynamoData.LastEvaluatedKey;
      return await scanDaynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (err) {
    console.log("error", err);
  }
}

async function saveProduct(requestBody) {
  const params = {
    TableName: dyanmodbtable,
    Item: requestBody,
  };
  return dyanmodb
    .put(params)
    .promise()
    .then(() => {
      const body = {
        Operation: "SAVE",
        Message: "SUCCESS",
        Item: requestBody,
      };
      return buildResponse(200, body);
    })
    .catch((err) => {
      console.log("Error", err);
    });
}

async function modifyProduct(productid, updateKey, updateValue) {
  const params = {
    TableName: dyanmodbtable,
    Key: {
      productid: productid,
    },
    updateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return await dyanmodb
    .update(params)
    .promise()
    .then((response) => {
      const body = {
        Operation: "UPDATE",
        Message: "SUCCESS",
        Item: response,
      };

      return buildResponse(200, body);
    })
    .catch((err) => {
      console.log("error", err);
    });
}

async function deleteProduct(productid) {
  const params = {
    TableName: dyanmodbtable,
    Key: {
      productid: productid,
    },
    ReturnValues: "ALL_OLD",
  };

  return await dyanmodb
    .delete(params)
    .promise()
    .then((response) => {
      const body = {
        Operation: "DELETE",
        Message: "SUCCESS",
        Item: response,
      };
      return buildResponse(200, body);
    })
    .catch((err) => {
      console.log("Error", err);
    });
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
