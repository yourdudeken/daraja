import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    retryCount?: number;
  }
}
