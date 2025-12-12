interface EnvErrorProps {
  missingVars: string[];
}

const EnvError = ({ missingVars }: EnvErrorProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Configuration manquante
        </h1>

        <p className="text-gray-600 text-center mb-6">
          L'application ne peut pas demarrer car certaines variables d'environnement sont manquantes.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-2">
            Variables manquantes :
          </h2>
          <ul className="space-y-1">
            {missingVars.map((varName) => (
              <li key={varName} className="flex items-center gap-2 text-red-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <code className="font-mono text-sm bg-red-100 px-2 py-0.5 rounded">
                  {varName}
                </code>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">
            Comment corriger :
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-700 text-sm">
            <li>
              Allez dans les parametres de votre projet Vercel
            </li>
            <li>
              Naviguez vers <strong>Settings → Environment Variables</strong>
            </li>
            <li>
              Ajoutez les variables manquantes pour <strong>Production</strong> et <strong>Preview</strong>
            </li>
            <li>
              Redéployez l'application
            </li>
          </ol>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="font-semibold text-gray-800 mb-2">
            Variables requises :
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <code className="font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-800">
                VITE_SUPABASE_URL
              </code>
              <span className="text-gray-600">- URL de votre projet Supabase</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-800">
                VITE_SUPABASE_PUBLISHABLE_KEY
              </code>
              <span className="text-gray-600">- Cle publique (anon key) Supabase</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Ces variables se trouvent dans votre dashboard Supabase → Project Settings → API
        </p>
      </div>
    </div>
  );
};

export default EnvError;
