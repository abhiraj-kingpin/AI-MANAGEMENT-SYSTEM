/// Domain-level failure types — what a repository returns to a use case
/// when something goes wrong, translated from the data layer's [Exception]s.
sealed class Failure {
  final String message;
  const Failure(this.message);
}

class ServerFailure extends Failure {
  final String? code;
  const ServerFailure(super.message, {this.code});
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}
