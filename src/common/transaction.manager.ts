export interface TransactionManager {
  run<T>(callback: (tx: unknown) => Promise<T>): Promise<T>;
}
