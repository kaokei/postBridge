/* eslint-disable @typescript-eslint/ban-types */
type SafeAny = any;

/**
 * jsbridge for iframes or windows by `window.postMessage`
 *
 * 消息体所有属性：
 * postbridge: call|request|response
 * type: application/x-postbridge-v1+json
 * sourceId: uuid
 * destId: uuid 出现在response消息中，其实就是request消息中的的sourceId
 * uid: 自增ID
 * method: 用户自定义函数名
 * params: 用户自定义函数的第一个参数
 * value: 用户自定义函数的返回值
 */

export class PostBridge {
  // PostBridge 专属消息类型
  static messageType = 'application/x-postbridge-v1+json';

  // 发送postMessage消息的对象
  static currentTarget = window;

  // 存储用户注册的自定义函数
  // 用户自定义函数支持返回Promise
  static globalFunctionMap = {} as Record<string, Function>;

  // 当前实例的唯一ID
  static sourceId = '';

  // 通过uuid关联PostBridge实例
  static sourceMap = {} as Record<string, PostBridge>;

  // 临时存储PostBridge实例
  static validEventSource = [] as Array<PostBridge>;

  // 生成全局唯一ID
  static generateUUID() {
    let d = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
  }

  // 启动当前实例，并开始接受消息
  static start() {
    PostBridge.sourceId = PostBridge.generateUUID();
    PostBridge.currentTarget.addEventListener(
      'message',
      PostBridge.receiveMessageGateway,
      false
    );
  }

  // 全局接受消息的网关-统一在这里做消息转发
  static receiveMessageGateway(event: MessageEvent) {
    if (!(event && event.data && event.data.type === PostBridge.messageType)) {
      return;
    }
    const { sourceId } = event.data;
    const sourceMap = PostBridge.sourceMap;
    if (sourceMap[sourceId]) {
      sourceMap[sourceId].receiveMessage(event);
    } else {
      const validEventSource = PostBridge.validEventSource;
      const source = event.source;
      const index = validEventSource.findIndex(item => item.target === source);
      if (index >= 0) {
        sourceMap[sourceId] = validEventSource[index];
        validEventSource.splice(index, 1);
        sourceMap[sourceId].receiveMessage(event);
      }
    }
  }

  // 用户注册自定义函数
  static registerMethods(functionMap: Record<string, Function>) {
    const gfm = PostBridge.globalFunctionMap;
    for (const key in functionMap) {
      if (Object.prototype.hasOwnProperty.call(functionMap, key)) {
        gfm[key] = functionMap[key];
      }
    }
  }

  // 用户取消注册自定义函数
  static unregisterMethods(functionNameArr: string | string[]) {
    const gfm = PostBridge.globalFunctionMap;
    if (typeof functionNameArr === 'string') {
      delete gfm[functionNameArr];
    } else {
      functionNameArr.forEach(name => delete gfm[name]);
    }
  }

  public target: Window; // PostBridge实例关联的window对象
  public options: SafeAny; // 有两个作用，1传递origin，2作为用户自定义函数的第2个参数
  public messageId: number; // 每个消息的唯一ID
  public origin: string; // 当前target对应的origin，用来限制postMessage

  public constructor(target: Window, options = {} as SafeAny) {
    this.target = target;
    this.options = options;
    this.messageId = 1;
    this.origin = options.origin || '*';

    this.receiveMessage = this.receiveMessage.bind(this);

    PostBridge.validEventSource.push(this);
  }

  // 标记request类型的消息，因为需要在response中处理对应的回调
  generateNewMessageId() {
    return this.messageId++;
  }

  receiveMessage(event: MessageEvent) {
    const { postbridge, sourceId, uid, method, params } = event.data;
    const gfm = PostBridge.globalFunctionMap;

    if (postbridge === 'call') {
      // 接受消息-call
      if (method in gfm && typeof gfm[method] === 'function') {
        gfm[method](params, this.options);
      }
    } else if (postbridge === 'request') {
      // 接受消息-request
      if (method in gfm && typeof gfm[method] === 'function') {
        Promise.resolve(gfm[method](params, this.options)).then(value => {
          (event.source as Window).postMessage(
            {
              postbridge: 'response', // 发送消息-response
              type: PostBridge.messageType,
              sourceId: PostBridge.sourceId,
              destId: sourceId,
              uid,
              method,
              value,
            },
            event.origin
          );
        });
      }
    }
  }

  call(method: string, params?: SafeAny) {
    this.target.postMessage(
      {
        postbridge: 'call', // 发送消息-call
        type: PostBridge.messageType,
        sourceId: PostBridge.sourceId,
        method,
        params,
      },
      this.origin
    );
  }

  request(method: string, params?: SafeAny) {
    return new Promise((resolve, reject) => {
      const uid = this.generateNewMessageId();
      const sourceId = PostBridge.sourceId;
      const transact = (e: MessageEvent) => {
        // 接受消息-response
        if (
          e.data &&
          e.data.type === PostBridge.messageType &&
          e.data.destId === sourceId &&
          e.data.uid === uid &&
          e.data.postbridge === 'response'
        ) {
          PostBridge.currentTarget.removeEventListener('message', transact, false);
          resolve(e.data.value);
        }
      };
      PostBridge.currentTarget.addEventListener('message', transact, false);

      setTimeout(() => {
        PostBridge.currentTarget.removeEventListener('message', transact, false);
        reject('postBridge-request 20s timeout');
      }, 20000);

      this.target.postMessage(
        {
          postbridge: 'request', // 发送消息-request
          type: PostBridge.messageType,
          sourceId: PostBridge.sourceId,
          uid,
          method,
          params,
        },
        this.origin
      );
    });
  }
}
