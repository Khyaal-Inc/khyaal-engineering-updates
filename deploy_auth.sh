#!/bin/bash
set -euo pipefail

# Configuration
FUNCTION_NAME="khyaal-auth-gatekeeper"
ROLE_NAME="khyaal-auth-lambda-role"
API_NAME="khyaal-auth-api-v3"
REGION="ap-south-1" # Using Mumbai

echo "🚀 Starting 1-click deployment for Khyaal Auth Gateway via API Gateway..."
echo "📍 Target Region: $REGION (Mumbai)"

# 1. Zip the Lambda function
echo "📦 Zipping auth_gatekeeper.js..."
zip -q function.zip auth_gatekeeper.js

# 2. Create IAM Role if it doesn't exist
echo "🛡️  Checking IAM role..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$ROLE_ARN" ]; then
    echo "Creating IAM role: $ROLE_NAME..."
    ROLE_ARN=$(aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": { "Service": "lambda.amazonaws.com" }
        }]
    }' --query 'Role.Arn' --output text)
    
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    echo "⏳ Waiting for role to propagate..."
    sleep 10
fi

# 3. Create or Update Lambda Function
echo "🚀 Deploying Lambda function..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION >/dev/null 2>&1; then
    echo "Updating existing function..."
    aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://function.zip --region $REGION > /dev/null
else
    echo "Creating new function..."
    aws lambda create-function --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --handler auth_gatekeeper.handler \
        --role $ROLE_ARN \
        --zip-file fileb://function.zip \
        --region $REGION > /dev/null
fi

# 4. Cleanup redundant Lambda Function URL if it exists
echo "🧹 Cleaning up old Lambda Function URL configurations..."
aws lambda delete-function-url-config --function-name $FUNCTION_NAME --region $REGION >/dev/null 2>&1

# 5. Create or Get API Gateway (HTTP API)
echo "🌐 Configuring API Gateway (HTTP API)..."
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text | head -n 1)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ] || [ "$API_ID" == "" ]; then
    echo "Creating new HTTP API..."
    API_ID=$(aws apigatewayv2 create-api --name "$API_NAME" \
        --protocol-type HTTP \
        --region $REGION --query 'ApiId' --output text)
else
    echo "Updating existing HTTP API configuration..."
    # No Gateway-level CORS config - Lambda handles all CORS
fi

# 6. Create Integration
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION --query "Items[?IntegrationUri=='arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME'].IntegrationId" --output text | head -n 1)

if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" == "None" ] || [ "$INTEGRATION_ID" == "" ]; then
    echo "Creating API Integration..."
    INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id $API_ID \
        --integration-type AWS_PROXY \
        --integration-uri "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME" \
        --payload-format-version "2.0" \
        --region $REGION --query 'IntegrationId' --output text)
fi

# 7. Create/Update Route (Using ANY / for full Lambda control)
ANY_ROUTE_ID=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query "Items[?RouteKey=='ANY /'].RouteId" --output text | head -n 1)
if [ -z "$ANY_ROUTE_ID" ] || [ "$ANY_ROUTE_ID" == "None" ] || [ "$ANY_ROUTE_ID" == "" ]; then
    echo "Creating ANY / route..."
    aws apigatewayv2 create-route --api-id $API_ID \
        --route-key "ANY /" \
        --target "integrations/$INTEGRATION_ID" \
        --region $REGION > /dev/null
else
    echo "ANY / route already exists."
fi

# Clean up specific routes if they exist
POST_ROUTE_ID=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query "Items[?RouteKey=='POST /'].RouteId" --output text | head -n 1)
if [ ! -z "$POST_ROUTE_ID" ] && [ "$POST_ROUTE_ID" != "None" ] && [ "$POST_ROUTE_ID" != "" ]; then
    echo "Cleaning up old POST / route..."
    aws apigatewayv2 delete-route --api-id $API_ID --route-id $POST_ROUTE_ID --region $REGION
fi

OPTIONS_ROUTE_ID=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query "Items[?RouteKey=='OPTIONS /'].RouteId" --output text | head -n 1)
if [ ! -z "$OPTIONS_ROUTE_ID" ] && [ "$OPTIONS_ROUTE_ID" != "None" ] && [ "$OPTIONS_ROUTE_ID" != "" ]; then
    echo "Cleaning up old OPTIONS / route..."
    aws apigatewayv2 delete-route --api-id $API_ID --route-id $OPTIONS_ROUTE_ID --region $REGION
fi

# 8. Create $default Stage if it doesn't exist
STAGE_EXISTS=$(aws apigatewayv2 get-stage --api-id $API_ID --stage-name '$default' --region $REGION 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Creating \$default stage..."
    aws apigatewayv2 create-stage --api-id $API_ID \
        --stage-name '$default' \
        --auto-deploy \
        --region $REGION > /dev/null
else
    echo "Updating \$default stage..."
    aws apigatewayv2 update-stage --api-id $API_ID \
        --stage-name '$default' \
        --auto-deploy \
        --region $REGION > /dev/null
fi

# 9. Add Lambda Permission for APIGW
STMT_ID="AllowAPIGatewayInvoke-New"
# Try removing existing one first to avoid error if it exists
aws lambda remove-permission --function-name $FUNCTION_NAME --statement-id "$STMT_ID" --region $REGION 2>/dev/null

aws lambda add-permission --function-name $FUNCTION_NAME \
    --statement-id "$STMT_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" \
    --region $REGION > /dev/null 2>&1

LAMBDA_URL="https://$API_ID.execute-api.$REGION.amazonaws.com"

# 10. Set Lambda environment variables (GITHUB_TOKEN, EXPECTED_PASSWORD_HASH, JWT_SECRET)
echo ""
echo "🔐 Configuring Lambda environment variables..."

# Read existing env vars to preserve any not managed here
EXISTING_VARS=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query 'Environment.Variables' \
    --output json 2>/dev/null || echo '{}')

# Require GITHUB_TOKEN — fail fast if not in environment
if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "❌ GITHUB_TOKEN environment variable is not set."
    echo "   Export it before running this script:"
    echo "   export GITHUB_TOKEN=<your-github-pat>"
    exit 1
fi

# EXPECTED_PASSWORD_HASH no longer required — auth is handled via users.json + JWT

# Generate JWT_SECRET if not already set
if [ -z "${JWT_SECRET:-}" ]; then
    # Check if it's already set in Lambda (preserve the existing secret across deploys)
    EXISTING_JWT_SECRET=$(echo "$EXISTING_VARS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('JWT_SECRET',''))" 2>/dev/null || echo "")
    if [ -n "$EXISTING_JWT_SECRET" ]; then
        JWT_SECRET="$EXISTING_JWT_SECRET"
        echo "   Preserving existing JWT_SECRET from Lambda config"
    else
        JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        echo "   Generated new JWT_SECRET (32-byte random)"
    fi
fi

aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --environment "Variables={GITHUB_TOKEN=$GITHUB_TOKEN,JWT_SECRET=$JWT_SECRET}" \
    > /dev/null

echo "   ✅ GITHUB_TOKEN set"
echo "   ✅ JWT_SECRET set"

# 11. Wait for Lambda to finish updating before deploying code
echo ""
echo "⏳ Waiting for Lambda to finish updating configuration..."
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

# 12. Update LAMBDA_URL constant in index.html
echo ""
echo "📝 Updating LAMBDA_URL in index.html..."
# Replace the const LAMBDA_URL = '...' line with the new URL (handles any existing URL value)
sed -i '' "s|const LAMBDA_URL = '.*';|const LAMBDA_URL = '$LAMBDA_URL';|" index.html

# Verify the replacement worked
if grep -q "const LAMBDA_URL = '$LAMBDA_URL';" index.html; then
    echo "   ✅ LAMBDA_URL updated to: $LAMBDA_URL"
else
    echo "   ⚠️  Could not auto-update LAMBDA_URL — update manually in index.html:"
    echo "   const LAMBDA_URL = '$LAMBDA_URL';"
fi

echo ""
echo "✅ Deployment complete!"
echo "-----------------------------------"
echo "Endpoint URL: $LAMBDA_URL"
echo "-----------------------------------"

# Cleanup
rm function.zip
