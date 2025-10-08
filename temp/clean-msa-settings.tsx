// MSA Einstellungen - Navigation zu separaten Seiten
function MSASettings() {
  const [, navigate] = useLocation();

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Profil & Stammdaten',
      description: 'Persönliche Daten und Kontaktinformationen verwalten',
      icon: User,
      path: '/msa/profile'
    },
    {
      id: 'business',
      title: 'Geschäftsdaten & Rechnungsstellung',
      description: 'Firmeninformationen für die Abrechnung verwalten',
      icon: Building2,
      path: '/msa/business'
    },
    {
      id: 'pricing',
      title: 'Preisgestaltung & Pakete',
      description: 'Abrechnung und Preismodelle konfigurieren',
      icon: Euro,
      path: '/msa/pricing'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MSA Einstellungen</CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Multi-Shop Admin Einstellungen und Konfigurationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {settingsOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card 
                  key={option.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(option.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {option.description}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}