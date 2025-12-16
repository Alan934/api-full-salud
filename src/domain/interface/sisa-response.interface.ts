export interface SisaResponse {
  isValid: boolean;
  professionalInfo?: {
    name: string;
    lastName: string;
    profession: string;
    license: string;
  };
}

export interface SisaProfessionalMatricula {
  matricula: string;
  provincia: string;
  profesion: string;
  estado: string;
}

export interface SisaPractitionerResponse {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  cuit: string;
  matriculasHabilitadas: SisaProfessionalMatricula[];
}