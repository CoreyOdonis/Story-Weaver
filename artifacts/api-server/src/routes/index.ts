import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storyRouter from "./story";
import savedStoriesRouter from "./savedStories";
import ttsRouter from "./tts";
import streakRouter from "./streak";
import illustrationsRouter from "./illustrations";
import voiceRouter from "./voice";
import authRouter from "./auth";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use(authRouter);
router.use(preferencesRouter);
router.use(healthRouter);
router.use(storyRouter);
router.use(savedStoriesRouter);
router.use(ttsRouter);
router.use(streakRouter);
router.use(illustrationsRouter);
router.use(voiceRouter);

export default router;
