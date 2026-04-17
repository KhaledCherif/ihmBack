export enum ServiceRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REFUSED = 'refused',
  CANCELLED_BY_CLIENT = 'cancelled_by_client',
  CANCELLED_BY_PROVIDER = 'cancelled_by_provider',
  DISPUTED = 'disputed',
  RESOLVED = 'resolved',
}
