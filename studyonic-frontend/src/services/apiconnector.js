import axios from "axios";
import axiosRetry from 'axios-retry';

export const axiosInstance = axios.create({});

axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (retryCount) => {
        console.log(`Retrying request, attempt #${retryCount}`);
        return retryCount * 1000; // Time interval between retries
    },
    retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        return (
            axiosRetry.isNetworkError(error) ||
            error.response.status === 503 ||
            error.response.status === 502 ||
            error.response.status === 504
        );
    },
});

export const apiConnector = (method, url, bodyData, headers, params) => {
    return axiosInstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null,
    });
}