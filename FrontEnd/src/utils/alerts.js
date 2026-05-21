import Swal from 'sweetalert2';

const BASE = {
  confirmButtonColor: '#8DC63F',
  cancelButtonColor:  '#4A4A4A',
  borderRadius:       '16px',
  customClass: {
    popup:         'swal-garnier',
    confirmButton: 'swal-btn-confirm',
    cancelButton:  'swal-btn-cancel',
  },
};

export const showSuccess = (title, text) =>
  Swal.fire({ ...BASE, icon: 'success', title, text,
    showConfirmButton: false, timer: 3000, timerProgressBar: true });

export const showError = (title, text) =>
  Swal.fire({ ...BASE, icon: 'error', title, text });

export const showWarning = (title, text) =>
  Swal.fire({ ...BASE, icon: 'warning', title, text });

export const showToast = (message, icon = 'success') =>
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title: message,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

export const showConfirm = (title, text) =>
  Swal.fire({
    ...BASE, icon: 'question', title, text,
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText:  'Cancelar',
  });
