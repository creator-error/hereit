import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SceneTools } from "./SceneTools";

const meta = {
  title: "features/spark-viewer/SceneTools",
  component: SceneTools,
} satisfies Meta<typeof SceneTools>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    className: "",
    setMovementControl: (key, active) => {
      console.log(`setMovementControl: ${key} ${active}`);
    },
    endMovementControl: (key) => {
      console.log(`endMovementControl: ${key}`);
    },
    setSoundEnabled: (enabled) => {
      console.log(`setSoundEnabled: ${enabled}`);
    },
  },
};
