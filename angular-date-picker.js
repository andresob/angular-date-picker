(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([ 'module', 'angular' ], function (module, angular) {
            module.exports = factory(angular);
        });
    } else if (typeof module === 'object') {
        module.exports = factory(require('angular'));
    } else {
        if (!root.mp) {
            root.mp = {};
        }

        root.mp.datePicker = factory(root.angular);
    }
}(this, function (angular) {
    'use strict';

    return angular.module('mp.datePicker', []).directive('datePicker', [ '$window', '$locale', function ($window, $locale) {
        // Introduce custom elements for IE8
        $window.document.createElement('date-picker');

        var tmpl = ''
        + '<div class="angular-date-picker" layout-fill>'
        + '    <div class="buttons">'
        + '        <button type="button" class="previous" ng-click="changeMonthBy(-1)">'
        + '            <svg style="width:24px;height:24px" viewBox="0 0 24 24">'
        + '            <path fill="#444" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />'
        + '            </svg>'
        + '        </button>'
        + '        <button type="button" class="next" ng-click="changeMonthBy(1)">'
        + '            <svg style="width:24px;height:24px" viewBox="0 0 24 24">'
        + '            <path fill="#444" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />'
        + '            </svg>'
        + '        </button>'
        + '    </div>'
        + '    <div ng-click="pickDay($event)" layout="column" class="double-picker" layout-align="center center">'
        + '        <h2 layout-padding-hor>{{ year }}</h2>'
        + '        <div layout>'
        + '          <div class="_days" flex layout="column">'
        + '            <div title="{{ months[month].fullName }}" layout layout-align="center center" class="primary-info md-body-1">{{ months[month].fullName }}</div>'
        + '            <div layout layout-padding>'
        + '               <div class="_day-of-week" ng-repeat="dayOfWeek in daysOfWeek" title="{{ dayOfWeek.fullName }}">{{ dayOfWeek.firstLetter }}</div>'
        + '            </div>'
        + '            <div layout-padding>'
        + '               <div class="_day -padding" ng-repeat="day in leadingDays">{{ day }}</div>'
        + '               <div class="_day -selectable" ng-repeat="day in days" ng-class="{ \'-selected\': (day === selectedDay), \'-today\': (day === today) }">{{ day }}</div>'
        + '            </div>'
        + '          </div>'
        + '          <div class="_days" flex layout="column" hide-sm>'
        + '            <div title="{{ months[(month+1)%12].fullName }}" layout layout-align="center center" class="primary-info md-body-1">{{ months[(month+1)%12].fullName }}</div>'
        + '            <div layout layout-padding>'
        + '               <div class="_day-of-week" ng-repeat="dayOfWeek in daysOfWeek" title="{{ dayOfWeek.fullName }}">{{ dayOfWeek.firstLetter }}</div>'
        + '            </div>'
        + '            <div layout-padding>'
        + '               <div class="_day -padding" ng-repeat="day in leadingDaysNext">{{ day }}</div>'
        + '             <div class="_day -selectable" ng-repeat="day in days" ng-class="{ \'-selected\': (day === selectedDay) }">{{ day }}</div>'
        + '          </div>'
        + '        </div>'
        + '      </div>'
        + '    </div>'
        + '</div>'
        ;

        return {
            restrict: 'AE',
            template: tmpl,
            replace: true,
            require: '?ngModel',
            scope: {
                onDateSelected: '&',
                formatDate: '=', // @todo breaking change: change to & to allow use of date filter directly
                parseDate: '=' // @todo change to &
            },

            link: function ($scope, $element, $attributes, ngModel) {
                var selectedDate = null,
                    days = [], // Slices of this are used for ngRepeat
                    months = [],
                    nextMonth = [],
                    daysOfWeek = [],
                    firstDayOfWeek = $locale.DATETIME_FORMATS.FIRSTDAYOFWEEK || 0;

                for (var i = 1; i <= 31; i++) {
                    days.push(i);
                }

                for (var i = 0; i < 12; i++) {
                    months.push({
                        fullName: $locale.DATETIME_FORMATS.MONTH[i],
                        shortName: $locale.DATETIME_FORMATS.SHORTMONTH[i]
                    });
                }


                for (var i = 0; i < 12; i++) {
                    nextMonth.push({
                        fullName: $locale.DATETIME_FORMATS.MONTH[i],
                        shortName: $locale.DATETIME_FORMATS.SHORTMONTH[i]
                    });
                }


                for (var i = 0; i < 7; i++) {
                    var day = $locale.DATETIME_FORMATS.DAY[(i + firstDayOfWeek) % 7];

                    daysOfWeek.push({
                        fullName: day,
                        firstLetter: day.substr(0, 1)
                    });
                }

                $scope.months = months;
                $scope.nextMonth = nextMonth;
                $scope.daysOfWeek = daysOfWeek;

                function setYearAndMonth(date) {
                    $scope.year = date.getFullYear();
                    $scope.month = date.getMonth();
                    $scope.nextMonth = date.getMonth()+1;

                    var now = new Date();

                    $scope.today = now.getFullYear() === $scope.year && now.getMonth() === $scope.month
                        ? now.getDate()
                        : null;

                    $scope.selectedDay = selectedDate
                            && selectedDate.getFullYear() === $scope.year
                            && selectedDate.getMonth() === $scope.month
                        ? selectedDate.getDate()
                        : null;

                    var firstDayOfMonth = new Date($scope.year, $scope.month, 1),
                        lastDayOfMonth = new Date($scope.year, $scope.month + 1, 0),
                        lastDayOfPreviousMonth = new Date($scope.year, $scope.month, 0),
                        daysInMonth = lastDayOfMonth.getDate(),
                        daysInLastMonth = lastDayOfPreviousMonth.getDate(),
                        dayOfWeek = firstDayOfMonth.getDay(),
                        leadingDays = (dayOfWeek - firstDayOfWeek + 7) % 7 || 7; // Ensure there are always leading days to give context

                    $scope.leadingDays = days.slice(- leadingDays - (31 - daysInLastMonth), daysInLastMonth);
                    $scope.days = days.slice(0, daysInMonth);
                    // Ensure a total of 6 rows to maintain height consistency
                    $scope.trailingDays = days.slice(0, 6 * 7 - (leadingDays + daysInMonth));

                    var firstDayOfNextMonth = new Date($scope.year, $scope.nextMonth, 1),
                        lastDayOfNextMonth = new Date($scope.year, $scope.nextMonth + 1, 0),
                        lastDayOfPreviousNextMonth = new Date($scope.year, $scope.nextMonth, 0),
                        daysInNextMonth = lastDayOfNextMonth.getDate(),
                        daysInLastNextMonth = lastDayOfPreviousNextMonth.getDate(),
                        dayOfWeekNext = firstDayOfNextMonth.getDay(),
                        leadingDaysNext = (dayOfWeekNext - firstDayOfWeek + 7) % 7 || 7; // Ensure there are always leading days to give context

                    $scope.leadingDaysNext = days.slice(- leadingDaysNext - (31 - daysInLastNextMonth), daysInLastNextMonth);
                    $scope.daysNext = days.slice(0, daysInNextMonth);
                    // Ensure a total of 6 rows to maintain height consistency
                    $scope.trailingDaysNext = days.slice(0, 6 * 7 - (leadingDaysNext + daysInNextMonth));
                }

                // Default to current year and month
                setYearAndMonth(new Date());

                if (ngModel) {
                    ngModel.$render = function () {
                        selectedDate = ngModel.$viewValue
                            ? $scope.parseDate
                                ? $scope.parseDate(ngModel.$viewValue)
                                : new Date(ngModel.$viewValue)
                            : null;

                        if (selectedDate && !isNaN(selectedDate)) {
                            setYearAndMonth(selectedDate);
                        } else {
                            // Bad input, stay on current year and month, but reset selected date
                            $scope.selectedDay = null;
                        }
                    };
                }

                $scope.changeMonthBy = function (amount) {
                    var date = new Date($scope.year, $scope.month + amount, 1);
                    setYearAndMonth(date);
                };

                $scope.pickDay = function (evt) {
                    var target = angular.element(evt.target);

                    if (target.hasClass('-selectable')) {
                        var day = parseInt(target.text(), 10);

                        $scope.selectedDay = day;
                        selectedDate = new Date($scope.year, $scope.month, day);

                        if (ngModel) {
                            ngModel.$setViewValue(
                                $scope.formatDate
                                    ? $scope.formatDate(selectedDate)
                                    : selectedDate.toLocaleDateString()
                            );
                        }

                        $scope.onDateSelected();
                    }
                };
            }
        };
    }]);
}));
