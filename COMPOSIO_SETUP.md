# Composio Gmail Integration Setup

This guide will help you set up Composio for Gmail integration to enable email sending functionality in the pitch platform.

## Prerequisites

- Python environment with Composio installed
- Gmail account with API access
- Google Cloud Console project

## Setup Steps

### 1. Install Composio (Already Done)

```bash
cd agent
uv add composio
```

### 2. Set up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Desktop application"
4. Download the JSON file and save as `credentials.json` in the agent directory

### 4. Configure Composio

1. Set up Composio authentication:
```bash
cd agent
composio auth
```

2. Follow the prompts to authenticate with Gmail

### 5. Environment Variables

Create a `.env` file in the agent directory:

```env
COMPOSIO_API_KEY=your_composio_api_key
GOOGLE_CREDENTIALS_FILE=./credentials.json
```

## Usage

Once set up, the pitch platform will:

1. Create email drafts in Gmail when a successful pitch is completed
2. Allow sellers to edit the email content before sending
3. Store drafts in the seller's Gmail account for review

## Troubleshooting

- Ensure Gmail API is enabled in Google Cloud Console
- Check that OAuth credentials are properly configured
- Verify Composio authentication is working
- Check server logs for detailed error messages

## Features

- **Editable Email Templates**: Sellers can customize subject and body
- **Gmail Integration**: Creates drafts in seller's Gmail account
- **Company-Specific Data**: Automatically populates recipient and company info
- **Reset Functionality**: Reset to default template anytime
- **Validation**: Ensures subject and body are not empty before creating draft

## API Endpoints

- `POST /pitch/send-email` - Creates Gmail draft with provided content
- Uses Composio's `GMAIL_CREATE_EMAIL_DRAFT` action
- Returns success status and draft ID
