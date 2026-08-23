interface MockQuery<T> {
  select: jest.Mock<MockQuery<T>, unknown[]>;
  populate: jest.Mock<MockQuery<T>, unknown[]>;
  sort: jest.Mock<MockQuery<T>, unknown[]>;
  skip: jest.Mock<MockQuery<T>, unknown[]>;
  limit: jest.Mock<MockQuery<T>, unknown[]>;
  then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
}

export function mockQuery<T>(resolvedValue: T): MockQuery<T> {
  const query: MockQuery<T> = {
    select: jest.fn(() => query),
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return query;
}
