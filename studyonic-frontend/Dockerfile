FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG REACT_APP_BASE_URL
ARG REACT_APP_RAZORPAY_KEY
ENV REACT_APP_BASE_URL=$REACT_APP_BASE_URL
ENV REACT_APP_RAZORPAY_KEY=$REACT_APP_RAZORPAY_KEY
RUN CI=false npm run build

# Production Stage
FROM nginx:1.25-alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]