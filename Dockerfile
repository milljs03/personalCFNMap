# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
# Using --legacy-peer-deps to avoid issues with older dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of your application's code from your host to your image filesystem.
COPY . .

# The app listens on port 3000
EXPOSE 3000

# Command to run the application
CMD [ "node", "server.js" ]