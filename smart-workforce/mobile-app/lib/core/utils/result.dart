import 'package:ai_management_system/core/error/failures.dart';

sealed class Result<T> {
  const Result();

  R when<R>({
    required R Function(T value) success,
    required R Function(Failure failure) failure,
  }) {
    final self = this;
    return switch (self) {
      Success<T>() => success(self.value),
      ResultFailure<T>() => failure(self.failure),
    };
  }

  bool get isSuccess => this is Success<T>;
}

final class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}

final class ResultFailure<T> extends Result<T> {
  final Failure failure;
  const ResultFailure(this.failure);
}
