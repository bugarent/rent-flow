type OpenManageBookingListener = () => void;

const listeners = new Set<OpenManageBookingListener>();

/** Ask the header to open the same My Booking dialog used on desktop. */
export function requestOpenManageBooking() {
  listeners.forEach((listener) => listener());
}

export function subscribeOpenManageBooking(listener: OpenManageBookingListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
