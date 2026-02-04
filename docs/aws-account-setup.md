# AWS Account Setup Guide

This guide walks you through setting up an AWS account, creating IAM users, and configuring AWS CLI credentials for the System API project.

## Prerequisites

- An email address (for AWS account creation)
- A credit card (AWS Free Tier available for 12 months)
- Basic understanding of cloud services

## Step 1: Create AWS Account

1. **Go to AWS Sign-up Page**
   - Visit: https://aws.amazon.com/
   - Click "Create an AWS Account"

2. **Account Information**
   - Enter your email address
   - Choose a password (follow AWS password requirements)
   - Choose an account name (e.g., "My Development Account")

3. **Contact Information**
   - Enter your contact details
   - Select account type (Personal or Business)

4. **Payment Information**
   - Enter credit card details (required, but won't be charged for Free Tier usage)
   - AWS Free Tier includes:
     - 750 hours/month of DynamoDB (on-demand)
     - 1 million AppSync requests/month
     - Other free tier services

5. **Identity Verification**
   - AWS will call or text you to verify your phone number
   - Enter the verification code

6. **Support Plan Selection**
   - For POC/development: Select "Basic Plan" (free)
   - Click "Complete sign up"

7. **Account Activation**
   - Wait for account activation email (usually takes a few minutes)
   - Once activated, you can sign in to the AWS Console

## Step 2: Access AWS Console

1. **Sign In**
   - Go to: https://console.aws.amazon.com/
   - Sign in with your email and password

2. **Select Region**
   - Choose your preferred region from the top-right dropdown
   - Recommended: `us-east-1` (N. Virginia) for best service availability
   - Note: Some services are region-specific

## Step 3: Create IAM User (Recommended)

**Why create an IAM user?**
- Root account has full access - too powerful for daily use
- IAM users can have limited, specific permissions
- Better security practice
- Can create multiple users for different purposes

### 3.1 Create IAM User

1. **Navigate to IAM**
   - In AWS Console, search for "IAM" in the top search bar
   - Click on "IAM" service

2. **Create User**
   - Click "Users" in the left sidebar
   - Click "Create user" button

3. **User Details**
   - **User name**: Enter a descriptive name (e.g., `system-api-developer`)
   - **AWS credential type**: Select "Access key - Programmatic access"
   - Click "Next"

4. **Set Permissions** (Choose one option)

   **Option A: Administrator Access (For POC/Development)**
   - Select "Attach policies directly"
   - Check "AdministratorAccess" policy
   - ⚠️ **Note**: This gives full access. For production, use least-privilege policies.

   **Option B: Custom Policy (Recommended for Production)**
   - Click "Create policy"
   - Switch to JSON tab and paste a custom policy (see below)
   - Or attach specific managed policies:
     - `AmazonDynamoDBFullAccess`
     - `AWSAppSyncServiceRolePolicy`
     - `CloudFormationFullAccess`
     - `IAMFullAccess` (for CDK bootstrap)

5. **Review and Create**
   - Review user details
   - Click "Create user"

6. **Save Credentials** ⚠️ **IMPORTANT**
   - **Access Key ID**: Copy and save this (you'll see it only once)
   - **Secret Access Key**: Copy and save this securely (you'll see it only once)
   - Store these in a password manager or secure location
   - ⚠️ **Never commit these to git or share publicly**

### 3.2 Example Custom IAM Policy (Least Privilege)

For production use, create a custom policy with only necessary permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "appsync:*",
        "cloudformation:*",
        "iam:*",
        "logs:*",
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

**Note**: This is still quite permissive. For true least-privilege, restrict resources to specific ARNs.

## Quick Reference: Using .env for AWS Credentials

**TL;DR**: You can use `.env` file directly for AWS credentials instead of `aws configure`.

Add to your `.env` file:
```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1
```

The AWS SDK and AWS CLI automatically read these environment variables. No need to run `aws configure`!

See Step 5 below for detailed instructions.

---

## Step 4: Install AWS CLI

### macOS

```bash
# Using Homebrew (recommended)
brew install awscli

# Or using pip
pip3 install awscli
```

### Linux

```bash
# Using package manager
sudo apt-get update
sudo apt-get install awscli

# Or using pip
pip3 install awscli
```

### Windows

```powershell
# Using Chocolatey
choco install awscli

# Or download installer from AWS website
```

### Verify Installation

```bash
aws --version
# Should output: aws-cli/2.x.x or aws-cli/1.x.x
```

## Step 5: Configure AWS Credentials

You have two options for configuring AWS credentials:

### Option A: Using .env File (Recommended for This Project)

This project uses `.env` files for configuration. You can store AWS credentials directly in your `.env` file:

1. **Create or edit `.env` file** in the project root:

```bash
# AWS Credentials (from Step 3.1)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here

# AWS Configuration
AWS_REGION=us-east-1

# CDK Configuration
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1
```

2. **Verify Configuration**

Test your credentials:

```bash
# Load .env and test
export $(cat .env | grep -v '^#' | xargs)
aws sts get-caller-identity
```

Or use a tool that automatically loads `.env`:

```bash
# Using dotenv-cli (install: npm install -g dotenv-cli)
dotenv aws sts get-caller-identity

# Or source the .env file manually
set -a
source .env
set +a
aws sts get-caller-identity
```

**Expected output:**
```json
{
  "UserId": "AIDAXXXXXXXXXXXXXXXXX",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/system-api-developer"
}
```

**Advantages of .env method:**
- ✅ All project configuration in one place
- ✅ Easy to switch between environments
- ✅ Works seamlessly with this project's scripts
- ✅ No need to run `aws configure`

**Security Note:**
- ⚠️ `.env` file is already in `.gitignore` ✅
- ⚠️ Never commit `.env` to git
- ⚠️ Never share `.env` file contents

### Option B: Using AWS CLI Configuration (Traditional Method)

If you prefer the traditional AWS CLI approach:

1. **Run the configure command:**

```bash
aws configure
```

You'll be prompted for:

1. **AWS Access Key ID**: Enter the Access Key ID from Step 3.1
2. **AWS Secret Access Key**: Enter the Secret Access Key from Step 3.1
3. **Default region name**: Enter your preferred region (e.g., `us-east-1`)
4. **Default output format**: Enter `json` (recommended) or `text` or `table`

2. **Verify Configuration**

```bash
aws sts get-caller-identity
```

**If using AWS CLI config, also set in `.env`:**

```bash
# Use AWS profile (references ~/.aws/credentials)
AWS_PROFILE=default
AWS_REGION=us-east-1

# CDK Configuration
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1
```

**How AWS SDK picks up credentials (priority order):**
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) ← **Recommended for this project**
2. AWS credentials file (`~/.aws/credentials`) - used when `AWS_PROFILE` is set
3. IAM roles (if running on EC2/ECS/Lambda)
4. Other credential providers

This project's scripts automatically load `.env` file, so environment variables work seamlessly.

**Advantages of AWS CLI config:**
- ✅ Credentials stored in `~/.aws/credentials` (separate from project)
- ✅ Can manage multiple profiles easily
- ✅ Works with AWS SSO and other credential providers
- ✅ Standard AWS approach

### Which Method Should You Use?

**For this POC project, we recommend Option A (.env file)** because:
- The project already uses `.env` for all configuration
- CDK wrapper script automatically loads `.env` variables
- Simpler setup for a single project
- All configuration in one place

**Use Option B (AWS CLI config)** if:
- You're working with multiple AWS projects
- You need to use AWS SSO
- You prefer keeping credentials separate from project files
- You're using temporary credentials that rotate frequently

## Step 6: Using Multiple AWS Accounts/Profiles (Optional)

If you need to work with multiple AWS accounts or users:

### 6.1 Using .env Files (Recommended)

Create separate `.env` files for different environments:

**`.env.dev`**:
```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=dev-secret-key
AWS_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=111111111111
CDK_DEFAULT_REGION=us-east-1
```

**`.env.prod`**:
```bash
AWS_ACCESS_KEY_ID=AKIAYYYYYYYYYYYYYYYY
AWS_SECRET_ACCESS_KEY=prod-secret-key
AWS_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=222222222222
CDK_DEFAULT_REGION=us-east-1
```

Then use the appropriate file:
```bash
# For development
cp .env.dev .env
npm run deploy:dev

# For production
cp .env.prod .env
npm run deploy:dev
```

### 6.2 Using AWS Profiles (Alternative)

If using AWS CLI configuration method:

1. **Create Named Profile**

```bash
aws configure --profile my-dev-profile
```

2. **Use Profile in .env**

```bash
AWS_PROFILE=my-dev-profile
AWS_REGION=us-east-1
```

3. **Switch Profiles**

```bash
# Change AWS_PROFILE in .env file
AWS_PROFILE=my-prod-profile
```

## Step 7: Get Your AWS Account ID

You'll need your AWS Account ID for CDK deployment. Get it using:

```bash
aws sts get-caller-identity --query Account --output text
```

Or from the AWS Console:
- Click on your username in the top-right corner
- Your Account ID is displayed in the dropdown

Add this to your `.env` file:

```bash
CDK_DEFAULT_ACCOUNT=123456789012  # Replace with your actual account ID
CDK_DEFAULT_REGION=us-east-1
```

## Step 8: Verify Setup

Run these commands to verify everything is working:

```bash
# 1. Check AWS identity
aws sts get-caller-identity

# 2. List DynamoDB tables (should be empty or show existing tables)
aws dynamodb list-tables

# 3. Check AppSync APIs (should be empty or show existing APIs)
aws appsync list-graphql-apis

# 4. Verify CDK can access AWS
cd infra
cdk list
```

## Troubleshooting

### Error: "Unable to locate credentials"

**If using .env file:**
- Verify `.env` file exists in project root
- Check that `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Ensure `.env` is loaded: `export $(cat .env | grep -v '^#' | xargs)`
- Verify credentials are correct (no extra spaces, correct format)

**If using AWS CLI config:**
- Run `aws configure` again
- Check that `~/.aws/credentials` file exists (Linux/macOS) or `%USERPROFILE%\.aws\credentials` (Windows)
- Verify credentials are correct

### Error: "Access Denied" or "UnauthorizedOperation"

**Solution:**
- Verify IAM user has necessary permissions
- Check that you're using the correct Access Key ID
- Ensure the IAM user is active (not disabled)

### Error: "InvalidClientTokenId"

**Solution:**
- Access Key ID is incorrect or doesn't exist
- User may have been deleted
- Recreate IAM user and configure again

### Error: "SignatureDoesNotMatch"

**Solution:**
- Secret Access Key is incorrect
- Re-enter credentials: `aws configure`

### CDK Bootstrap Fails

**Solution:**
- Ensure IAM user has `CloudFormationFullAccess` and `IAMFullAccess` permissions
- Verify account ID is correct: `aws sts get-caller-identity`
- Check region matches: `aws configure get region`

## Security Best Practices

1. **Never commit credentials to git**
   - `.env` file should be in `.gitignore` ✅ (already configured)
   - Never share Access Keys in chat, email, or documentation

2. **Use IAM users, not root account**
   - Root account should only be used for account management
   - Daily operations should use IAM users with limited permissions

3. **Rotate credentials regularly**
   - In IAM Console → Users → Security credentials
   - Create new access keys
   - Update `.env` file (if using .env) or `aws configure` (if using AWS CLI config)
   - Delete old keys after verifying new ones work

4. **Use AWS Profiles for multiple accounts**
   - Separate development, staging, and production accounts
   - Use different profiles for each

5. **Enable MFA (Multi-Factor Authentication)**
   - For production accounts, enable MFA on IAM users
   - Provides additional security layer

## Next Steps

Once AWS is configured, you can:

1. **Deploy the stack**: See [Deployment Guide](./deployment.md)
2. **Set up local development**: See [Local Development Guide](./local-development.md)
3. **Test the API**: See [AWS AppSync Testing Guide](./aws-appsync-testing.md)

## Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Security Credentials](https://console.aws.amazon.com/iam/home#/security_credentials)

