import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ScenePopover } from "./ScenePopover";

const meta = {
  title: "features/spark-viewer/ScenePopover",
  component: ScenePopover,
} satisfies Meta<typeof ScenePopover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    activeTag: {
      id: "tag1",
      kind: "tag",
      title: "Scene Label",
      label: "Organization Name",
      linkUrl: "https://via.placeholder.com/150",
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
    setActiveTag: () => {},
  },
};
