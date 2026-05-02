import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storyRouter from "./story";
import savedStoriesRouter from "./savedStories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storyRouter);
router.use(savedStoriesRouter);

export default router;
