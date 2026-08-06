interface MockQuery<T> {
  select: jest.Mock<MockQuery<T>, unknown[]>;
  populate: jest.Mock<MockQuery<T>, unknown[]>;
  sort: jest.Mock<MockQuery<T>, unknown[]>;
  skip: jest.Mock<MockQuery<T>, unknown[]>;
  limit: jest.Mock<MockQuery<T>, unknown[]>;
  then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
}

/**
 * Mimics just enough of Mongoose's Query object to unit-test service code
 * that chains `Model.find(...).populate(...).sort(...).skip(...).limit(...)`
 * (or any subset/order of those) — real Query instances are chainable
 * (each of those returns `this`) *and* thenable (`await query` resolves
 * without ever calling `.exec()`). Letting service code use either calling
 * convention without the test caring which one it picked.
 */
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
