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

/// Not really a failure — a request that couldn't reach the server (no
/// connectivity) was queued locally instead, to sync automatically once
/// connectivity returns (see core/offline/). Modeled as a [Failure]
/// subtype anyway, deliberately: the immediate call still has no live
/// server-confirmed result to return, so it fits `Result`'s two branches
/// (success = confirmed, failure = not confirmed yet) without inventing a
/// third `Result` case — callers pattern-match on this type specifically
/// to show "queued" messaging instead of an error banner.
class OfflineQueuedFailure extends Failure {
  const OfflineQueuedFailure(super.message);
}
