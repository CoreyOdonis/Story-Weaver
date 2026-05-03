import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storyRouter from "./story";
import savedStoriesRouter from "./savedStories";
import ttsRouter from "./tts";
import streakRouter from "./streak";
import illustrationsRouter from "./illustrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storyRouter);
router.use(savedStoriesRouter);
router.use(ttsRouter);
router.use(streakRouter);
router.use(illustrationsRouter);

export default router;
