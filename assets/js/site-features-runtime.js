'use strict';

(function stabilizeMemberFeatureReview() {
  const oldList = document.querySelector('#memberReviewList');
  if (oldList) {
    const cleanList = oldList.cloneNode(false);
    oldList.replaceWith(cleanList);
  }

  const form = document.querySelector('#memberForm');
  form?.addEventListener('submit', () => {
    const list = document.querySelector('#memberReviewList');
    if (list) list.dataset.featuresAdded = 'false';
  });
})();
