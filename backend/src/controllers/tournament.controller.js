import { tournamentService } from "../services/tournament.service.js";

export const tournamentController = {
  async listPublic(_req, res, next) {
    try {
      const data = await tournamentService.listPublic();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async listAll(req, res, next) {
    try {
      const data = await tournamentService.listAll({ status: req.query.status });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await tournamentService.getById(req.params.id);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await tournamentService.create(req.validatedBody, req.staffProfile, req.ip);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await tournamentService.update(req.params.id, req.validatedBody, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const data = await tournamentService.updateStatus(req.params.id, req.validatedBody.status, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const data = await tournamentService.remove(req.params.id, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async register(req, res, next) {
    try {
      const data = await tournamentService.registerParticipant(req.params.id, req.validatedBody);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async listRegistrations(req, res, next) {
    try {
      const data = await tournamentService.listRegistrations(req.params.id, {
        search: req.query.search,
        regStatus: req.query.registration_status,
        paymentStatus: req.query.payment_status,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async updateRegistration(req, res, next) {
    try {
      const data = await tournamentService.updateRegistration(req.params.regId, req.validatedBody, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async exportRegistrations(req, res, next) {
    try {
      const csv = await tournamentService.exportRegistrationsCsv(req.params.id);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tournament-${req.params.id}-participants.csv"`);
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  },
};
