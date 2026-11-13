import { applyCommand, createDemoState, normalizeWorkspace, type Command, type Workspace } from './model';

const DATABASE = 'xu-cang-erp-v1';
const STORE = 'workspace';
let connection: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('当前浏览器不支持本地数据库，请使用新版浏览器。')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = undefined; }; resolve(request.result); };
    request.onerror = () => { connection = undefined; reject(new Error('无法打开本地数据库，请检查浏览器存储权限。')); };
    request.onblocked = () => { connection = undefined; reject(new Error('数据库正被其他旧标签占用，请关闭旧标签后重试。')); };
  });
  return connection;
}

/** Keep get → validate → put in one readwrite transaction, including initialization. */
export async function transact(command?: Command): Promise<Workspace> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const request = store.get('main');
    let result: Workspace;
    let failure: Error | undefined;
    request.onsuccess = () => {
      try {
        const current = request.result as Workspace | undefined;
        if (current && current.schemaVersion !== 1) throw new Error('工作区版本不兼容，已保留原始数据，请勿清理浏览器存储。');
        const initial = normalizeWorkspace(current ?? createDemoState());
        result = command ? applyCommand(initial, command) : initial;
        if (!current || command || !current.suppliers || !current.receipts || !current.counts || !current.salesReturns || !current.purchaseReturns) store.put(result, 'main');
      } catch (error) {
        failure = error instanceof Error ? error : new Error('操作失败');
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure ?? new Error('保存失败，本次操作未生效。请检查浏览器存储空间后重试。'));
    transaction.onerror = () => { failure ??= new Error('本地存储失败，本次操作未生效。'); };
  });
}
