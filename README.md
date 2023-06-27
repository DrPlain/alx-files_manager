# FILES MANAGER
## ABOUT
This project is a summary of backend concepts learnt during ALX backend specialization program: Authentication, NodeJS, MongoDB, Redis, pagination and background processing.

The objective is to build a simple API to upload and view files:
- User authentication via a token
- List all files
- Upload a new file
- Change permission of a file
- View a file
- Generate thumbnails for images

## API ENDPOINTS
- GET /status       [Checks the status of database connection]
- GET /stats        [Returns total number of users and and files]
- POST /users       [Email and password required]
- GET /connect      [Signs in a user and generates new API token]
- GET /disconnect   [Signs out a user and inactivates user token]
- GET /users/me     [Retrieves a user based on token]
- POST /files       [Posts a file to database, type = folder | image | file]
- GET /files/:id    [Retrieves a file based on file id]
- GET /files        [Retrieves all files owned by user or all public files if user is not authenticated]
- PUT /files/:id/publish    [Makes a file public]
- PUT /files/:id/unpublish  [Makes a file private]
- GET /files/:id/data       [Retrieves the content of the file with]

## AUTHOR
Gideon Obiasor || gideonobiasor@gmail.com