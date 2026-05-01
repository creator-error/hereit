import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SceneHeader } from "./SceneHeader";

const meta = {
  title: "features/spark-viewer/SceneHeader",
  component: SceneHeader,
} satisfies Meta<typeof SceneHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    className: "",
    sceneLabel: "Scene Label",
    organizationName: "Organization Name",
    organizationLogoUrl: "https://via.placeholder.com/150",
  },
};
