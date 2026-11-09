import { gameService } from "../services/game.service.js";
import { uploadCover } from "../services/media.service.js";

export const gameController = {
  async listPublic(_req, res, next) {
    try { return res.json({ success: true, data: await gameService.listPublic() }); } catch (err) { return next(err); }
  },
  async listAdmin(_req, res, next) {
    try { return res.json({ success: true, data: await gameService.listAdmin() }); } catch (err) { return next(err); }
  },
  async upload(req, res, next) {
    try { return res.status(201).json({ success: true, data: await uploadCover(req.file, req.body.folder === "tournaments" ? "tournaments" : "games") }); } catch (err) { return next(err); }
  },
  async create(req, res, next) {
    try { return res.status(201).json({ success: true, data: await gameService.create(req.validatedBody, req.staffProfile, req.ip) }); } catch (err) { return next(err); }
  },
  async update(req, res, next) {
    try { return res.json({ success: true, data: await gameService.update(req.params.id, req.validatedBody, req.staffProfile, req.ip) }); } catch (err) { return next(err); }
  },
  async remove(req, res, next) {
    try { return res.json({ success: true, data: await gameService.remove(req.params.id, req.staffProfile, req.ip) }); } catch (err) { return next(err); }
  },
};
