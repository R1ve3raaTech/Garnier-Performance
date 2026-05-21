import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl mb-4">🔒</p>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Acceso denegado</h1>
        <p className="text-gray-500 mb-6">No tienes permisos para ver esta página.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
