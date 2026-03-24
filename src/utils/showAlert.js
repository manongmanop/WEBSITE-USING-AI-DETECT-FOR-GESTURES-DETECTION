let SwalInstance = null;

/**
 * Lazily imports and returns the SweetAlert2 instance.
 */
export const getSwal = async () => {
  if (!SwalInstance) {
    SwalInstance = (await import("sweetalert2")).default;
  }
  return SwalInstance;
};

/**
 * Lazy loads SweetAlert2 and fires an alert.
 * 
 * @param {Object} options - SweetAlert2 options object
 * @returns {Promise} - Returns the SweetAlert2 promise
 */
export const showAlert = async (options) => {
  const Swal = await getSwal();
  return Swal.fire(options);
};

export default showAlert;
