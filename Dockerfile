# File: Dockerfile
# Description: This file contains the instructions for Docker to build a production-ready
# container for your Node.js application. It uses a multi-stage build for security
# and to create a small, efficient final image.

# --- Stage 1: Build Stage ---
# Use an official Node.js image as the base.
# The 'alpine' version is a lightweight Linux distribution.
FROM node:18-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your application's source code into the container
COPY . .


# --- Stage 2: Production Stage ---
# Use a slim, secure base image for the final container
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the 'build' stage
# This includes the installed node_modules and your source code
COPY --from=build /app .

# Tell Google Cloud what port the container will listen on.
# Cloud Run will automatically provide the PORT environment variable.
ENV PORT 8080

# The command to start your application when the container launches
CMD ["npm", "start"]

