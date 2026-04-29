export class UnauthorizedError extends Error {
  constructor(message = 'Ação não permitida.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Registro não encontrado.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Dados inválidos.') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Registro já existe.') {
    super(message);
    this.name = 'ConflictError';
  }
}
