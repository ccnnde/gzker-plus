import { onBeforeMount, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';

import { request, waitTime } from '@/utils';
import { emitter } from '@/utils/event-bus';
import { topicLinkRegExp } from '@/constants';
import { SELECTOR_TOPIC_LINK } from '@/constants/selector';

import type { Ref } from 'vue';

interface UseTopicHostNavigationOptions {
  isTopicPage: Readonly<Ref<boolean>>;
  openTopicInBlank: Readonly<Ref<boolean>>;
  onTopicSelected: (topicId: string | undefined) => void;
  onCreateTopic: (node: string) => void;
}

// @unocss-include
const CREATE_TOPIC_LINK_REGEXP = /\/t\/create\/(\w+)/;
const CREATE_BUTTON_CLASS = 'gzk-create-btn';
const CREATE_BUTTON_LOADING_CLASS = `${CREATE_BUTTON_CLASS}-loading`;

export const useTopicHostNavigation = ({
  isTopicPage,
  openTopicInBlank,
  onTopicSelected,
  onCreateTopic,
}: UseTopicHostNavigationOptions): void => {
  let topicLinkElements: NodeListOf<HTMLAnchorElement>;
  let insertedTopicButton: HTMLAnchorElement | undefined;
  let nodePublishButton: HTMLAnchorElement | null;
  let nodePublishButtonOriginalHtml: string | undefined;
  let nodePublishButtonHadCreateClass = false;

  const handleTopicClick = (event: Event) => {
    event.preventDefault();

    const { href } = event.target as HTMLAnchorElement;

    if (isTopicPage.value || openTopicInBlank.value) {
      window.open(href);
      return;
    }

    onTopicSelected(href.match(topicLinkRegExp)?.[1]);
  };

  const handleCreateTopicClick = async (event: Event) => {
    event.preventDefault();

    const createButton = document.querySelector<HTMLAnchorElement>(`.${CREATE_BUTTON_CLASS}`);
    createButton?.classList.add(CREATE_BUTTON_LOADING_CLASS);

    try {
      const createTopicLinkElement = event.currentTarget as HTMLAnchorElement;
      const href = createTopicLinkElement.getAttribute('href') as string;
      await waitTime(300);

      if (import.meta.env.PROD) {
        await request(href);
      }

      const node = href.match(CREATE_TOPIC_LINK_REGEXP)?.[1];
      onCreateTopic(node as string);
    } catch (err) {
      ElMessage.error((err as Error).message);
      console.error(err);
    } finally {
      createButton?.classList.remove(CREATE_BUTTON_LOADING_CLASS);
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  const insertTopicButton = () => {
    const publishButton = document.querySelector<HTMLButtonElement>('button.dropdown-toggle');
    const parentElement = publishButton?.parentElement;

    if (publishButton?.innerText.includes('发布新主题') && parentElement) {
      const button = document.createElement('a');
      const editIcon = document.createElement('div');
      const loadingIcon = document.createElement('div');

      button.href = '/t/create/water';
      button.className = `btn btn-primary ${CREATE_BUTTON_CLASS}`;
      editIcon.className = 'i-mdi-lead-pencil';
      loadingIcon.className = 'i-mdi-loading';

      parentElement.prepend(button);
      button.prepend(editIcon);
      button.prepend(loadingIcon);
      button.addEventListener('click', handleCreateTopicClick);
      insertedTopicButton = button;
    }

    const nodePublishButtonElement = document.querySelector<HTMLAnchorElement>(
      '.node-topics > .ui-header a[href^="/t/create"]',
    );

    if (nodePublishButtonElement?.innerText.includes('创建新主题')) {
      nodePublishButton = nodePublishButtonElement;
      nodePublishButtonOriginalHtml = nodePublishButtonElement.innerHTML;
      nodePublishButtonHadCreateClass = nodePublishButtonElement.classList.contains(CREATE_BUTTON_CLASS);

      const loadingIcon = document.createElement('div');
      loadingIcon.className = 'i-mdi-loading';
      nodePublishButtonElement.classList.add(CREATE_BUTTON_CLASS);
      nodePublishButtonElement.innerHTML = '<span>创建新主题</span>';
      nodePublishButtonElement.prepend(loadingIcon);
    }
  };

  onBeforeMount(() => {
    insertTopicButton();
  });

  onMounted(() => {
    topicLinkElements = document.querySelectorAll<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);

    topicLinkElements.forEach((element) => {
      const { href } = element;

      if (topicLinkRegExp.test(href)) {
        element.addEventListener('click', handleTopicClick);
      } else if (CREATE_TOPIC_LINK_REGEXP.test(href)) {
        element.addEventListener('click', handleCreateTopicClick);
      }
    });

    emitter.on('clickTopic', handleTopicClick);
  });

  onUnmounted(() => {
    topicLinkElements?.forEach((element) => {
      element.removeEventListener('click', handleTopicClick);
      element.removeEventListener('click', handleCreateTopicClick);
    });

    emitter.off('clickTopic', handleTopicClick);
    insertedTopicButton?.removeEventListener('click', handleCreateTopicClick);
    insertedTopicButton?.remove();

    if (nodePublishButton && nodePublishButtonOriginalHtml !== undefined) {
      nodePublishButton.innerHTML = nodePublishButtonOriginalHtml;
      nodePublishButton.classList.toggle(CREATE_BUTTON_CLASS, nodePublishButtonHadCreateClass);
    }
  });
};
