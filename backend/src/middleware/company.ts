import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.companyId) {
    return res.status(403).json({ error: 'No company associated with this account' });
  }
  next();
};

export const verifyCompanyAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const companyId = req.params.companyId || req.body.companyId;

  if (!companyId) return next();
  if (req.user?.role === 'ADMIN') return next();
  if (req.user?.companyId !== companyId) {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  next();
};
